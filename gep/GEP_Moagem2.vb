
Sub GEP_Moagem_2()


'Tip:
' 1. Use the <CTRL+SPACE> or <CTRL+I> shortcut to open a list of all objects and functions
' 2. Write the code using the HMI Runtime object.
'  Example: HmiRuntime.Screens("Screen_1").
' 3. Use the <CTRL+J> shortcut to create an object reference.
'Write the code as of this position:

Dim DataTime
Dim folder_y_m, folder_day, Z2, filepath, var, header , filepath_C
Dim fso, fso1, fso2, fso3  
Dim H, Min, S, d, Mon, Y
Dim val(116)
Dim i 

val(10)= SmartTags("Z2M01M1.Sts_Ligado") 'Z2M01M1_SIN_FUN_FLOAT - Sinaliza funcionando motor principal Do moinho (1 - Ligado e 2 - Desligado)
val(11)= SmartTags("Z2M01_PRODUTO") 'Z2M01_PRODUTO - Seleção de produto produzido ( 1 - CPIII 40 RS, 2 - CPII E40, 3 - Ensacado)
val(12)= SmartTags("Z2A01_POR_VAZ") 'Z2A01_POR_VAZ - Porcentagem de vazão da balança de calcário
val(13)= SmartTags("Z2A01_VAZ_DES") 'Z2A01_VAZ_DES - Vazão desejada da balança de calcário
val(14)= SmartTags("Z2A01_UMI_MAT") 'Z2A01_UMI_MAT - Umidade do material da balança de calcário
val(15)= SmartTags("Z2A01_VAZ_UMI") 'Z2A01_VAZ_UMI - Vazão Do material base umida na balança de calcário
val(16)= SmartTags("Z2A01_VAZ_SEC") 'Z2A01_VAZ_SEC - Vazão do material base seca na balança de calcário
val(17)= SmartTags("Z2A01_TOT_UMI") 'Z2A01_TOT_UMI - Totalizador do material base umida na balança de calcário
val(18)= SmartTags("Z2A01_TOT_SEC") 'Z2A01_TOT_SEC - Totalizador do material base seca na balança de calcário
val(19)= SmartTags("Z2A02_POR_VAZ") 'Z2A02_POR_VAZ - Porcentagem de vazão da balança de gesso
val(20)= SmartTags("Z2A02_VAZ_DES") 'Z2A02_VAZ_DES - Vazão desejada da balança de gesso
val(21)= SmartTags("Z2A02_UMI_MAT") 'Z2A02_UMI_MAT - Umidade do material da balança de gesso
val(22)= SmartTags("Z2A02_VAZ_UMI") 'Z2A02_VAZ_UMI - Vazão do material base umida na balança de gesso
val(23)= SmartTags("Z2A02_VAZ_SEC") 'Z2A02_VAZ_SEC - Vazão do material base seca na balança de gesso
val(24)= SmartTags("Z2A02_TOT_UMI") 'Z2A02_TOT_UMI - Totalizador do material base umida na balança de gesso
val(25)= SmartTags("Z2A02_TOT_SEC") 'Z2A02_TOT_SEC - Totalizador do material base seca na balança de gesso
val(26)= SmartTags("Z2A03_POR_VAZ") 'Z2A03_POR_VAZ - Porcentagem de vazão da balança de clinquer
val(27)= SmartTags("Z2A03_VAZ_DES") 'Z2A03_VAZ_DES - Vazão desejada da balança de clinquer
val(28)= SmartTags("Z2A03_UMI_MAT") 'Z2A03_UMI_MAT - Umidade do material da balança de clinquer
val(29)= SmartTags("Z2A03_VAZ_UMI") 'Z2A03_VAZ_UMI - Vazão do material base umida na balança de clinquer
val(30)= SmartTags("Z2A03_VAZ_SEC") 'Z2A03_VAZ_SEC - Vazão do material base seca na balança de clinquer
val(31)= SmartTags("Z2A03_TOT_UMI") 'Z2A03_TOT_UMI - Totalizador do material base umida na balança de clinquer
val(32)= SmartTags("Z2A03_TOT_SEC") 'Z2A03_TOT_SEC - Totalizador do material base seca na balança de clinquer
val(33)= SmartTags("Z2A04_POR_VAZ") 'Z2A04_POR_VAZ - Porcentagem de vazão da balança de escória
val(34)= SmartTags("Z2A04_VAZ_DES") 'Z2A04_VAZ_DES - Vazão desejada da balança de escória
val(35)= SmartTags("Z2A04_UMI_MAT") 'Z2A04_UMI_MAT - Umidade do material da balança de escória
val(36)= SmartTags("Z2A04_VAZ_UMI") 'Z2A04_VAZ_UMI - Vazão do material base umida na balança de escória
val(37)= SmartTags("Z2A04_VAZ_SEC") 'Z2A04_VAZ_SEC - Vazão do material base seca na balança de escória
val(38)= SmartTags("Z2A04_TOT_UMI") 'Z2A04_TOT_UMI - Totalizador do material base umida na balança de escória
val(39)= SmartTags("Z2A04_TOT_SEC") 'Z2A04_TOT_SEC - Totalizador do material base seca na balança de escória
val(40)= SmartTags("BAL_DOS_SOM_TOT_POR_M2") 'BAL_DOS_SOM_TOT_POR - Soma total porcentagem das balanças dosadoras
val(41)= SmartTags("BAL_DOS_SOM_TOT_VAZ_UMI_M2") 'BAL_DOS_SOM_TOT_VAZ_UMI - Soma total vazão umida das balanças dosadoras
val(42)= SmartTags("BAL_DOS_SOM_TOT_VAZ_SEC_M2") 'BAL_DOS_SOM_TOT_VAZ_SEC - Soma total vazão seca das balanças dosadoras
val(43)= SmartTags("Z2J03C1_SET_POI_PID") 'Z2J03C1_SET_POI_PID - Set-point corrente elevador retorno de controle do PID
val(44)= SmartTags("SET_POI_PRO_MOI")' SET_POI_PRO_MOI - Set-point de produção do moinho
val(45)= SmartTags("SET_POI_MAN_PRO_MOI_M2") 'SET_POI_MAN_PRO_MOI - Set-point manual da produção do moinho
val(46)= SmartTags("LIM_MAX_PRO_MOI") 'LIM_MAX_PRO_MOI - Limite máximo de produção do moinho
val(47)= SmartTags("VAR_PID_PRO_MOI") 'SET_POI_PRO_MOI - Set-point de produção do moinho
val(48)= SmartTags("SOMA_TOT_BALANCAS")' SOMA_TOT_BALANCAS - Soma do totalizador das balanças moagem 2
val(49)= SmartTags("SOMA_TOT_CONSUMO") 'SOMA_TOT_CONSUMO - Soma do totalizador consumo moagem 2
val(50)= SmartTags("TOT_INICIAL_BALANCAS") 'TOT_INICIAL_BALANCAS - Totalizador inicial das balanças moagem 2
val(51)= SmartTags("TOT_INICIAL_CONSUMO_") 'TOT_INICIAL_CONSUMO - Totalizador inicial consumo moagem 2
val(52)= SmartTags("Z2M01M1.Sts_Hora")' Z2M01M1_TOT_HOR_FUN - Totalizador funcionamento (horas) Do motor principal Do moinho
val(53)= SmartTags("Z2M01M1_Minutos") 'Z2M01M1_TOT_MIN_FUN - Totalizador funcionamento (minutos) do motor principal do moinho
val(54)= SmartTags("Z2M01M1_Segundos")' Z2M01M1_TOT_HOR_FUN - Totalizador funcionamento (horas) Do motor principal Do moinho
val(55)= SmartTags("Z2J01T1.STS_O_Sinal_EU") 'Z2J01T1_LEI_TEMP - Leitura temperatura de saída do moinho
val(56)= SmartTags("Z2P01P1.STS_O_Sinal_EU") ' Z2P01P1_LEI_PRES - Leitura pressão entrada Do filtro de processo
val(57)= SmartTags("Z2P01P2.STS_O_Sinal_EU") ' Z2P01P2_LEI_PRES - Leitura pressão saída Do filtro de processo
val(58)= SmartTags("Z2P01T1.STS_O_Sinal_EU") ' Z2P01T1_LEI_TEMP - Leitura temperatura entrada filtro de processo
val(59)= SmartTags("Z2S01P1.STS_O_Sinal_EU") ' Z2S01P1_LEI_PRES - Leitura pressão da saída Do moinho para o separador
val(60)= SmartTags("Z2L01.Sts_Pos") ' Z2L01_LEI_ABER - Leitura abertura válvula ar primário Do separador
val(61)= SmartTags("Z2P01D1.STS_O_Sinal_EU") ' Z2P01D1_LEI_PRE_DIF - Leitura pressão diferencial Do filtro de processo
val(62)= SmartTags("Z2M01M1_TEMP_FAL_ALI") 'Z2M01M1_TEMP_FAL_ALI - Temporização falta de alimentação Do moinho
val(63)= SmartTags("Z2M01M1_TOT_CONS_ENE")' Z2M01M1_TOT_CONS_ENE - Totalizador de Consumo de Energia Do Motor Do moinho
val(64)= SmartTags("CCM2_TOT_CONS_ENE")' CCM2_TOT_CONS_ENE - Totalizador de Consumo de Energia Do CCM 1
val(65)= SmartTags("CCM2.LEI_TEN_L1_NEU") ' CCM2_LEI_TEN_L1_NEU - Leitura tensão entre L1 e neutro Do CCM 1
val(66)= SmartTags("CCM2.LEI_TEN_L2_NEU")' CCM2_LEI_TEN_L2_NEU - Leitura tensão entre L2 e neutro Do CCM 1
val(67)= SmartTags("CCM2.LEI_TEN_L3_NEU")' CCM2_LEI_TEN_L3_NEU - Leitura tensão entre L3 e neutro Do CCM 1
val(68)= SmartTags("CCM2.LEI_TEN_L1_L2")' CCM2_LEI_TEN_L1_L2 - Leitura tensão entre L1 e L2 Do CCM 1
val(69)= SmartTags("CCM2.LEI_TEN_L2_L3")' CCM_LEI_TEN_L2_L3 - Leitura tensão entre L2 e L3 Do CCM 1
val(70)= SmartTags("CCM2.LEI_TEN_L1_L3")' CCM2_LEI_TEN_L1_L3 - Leitura tensão entre L1 e L3 Do CCM 1
val(71)= SmartTags("CCM2.LEI_COR_L1")' CCM2_LEI_COR_L1 - Leitura corrente em L1 Do CCM 1
val(72)= SmartTags("CCM2.LEI_COR_L2")' CCM2_LEI_COR_L2 - Leitura corrente em L2 Do CCM 1
val(73)= SmartTags("CCM2.LEI_COR_L3")' CCM2_LEI_COR_L3 - Leitura corrente em L3 Do CCM 1
val(74)= SmartTags("CCM2.LEI_POT_ATI_TOT")' CCM2_LEI_POT_ATI_TOT - Leitura potência ativa total Do CCM 1
val(75)= SmartTags("CCM2.LEI_POT_REA_TOT")' CCM2_LEI_POT_REA_TOT - Leitura potência reativa total Do CCM 1
val(76)= SmartTags("CCM2.LEI_DEM_POT_ATI")' CCM2_LEI_DEM_POT_ATI - Leitura demanda potência ativa Do CCM 1
val(77)= SmartTags("CCM2.LEI_FAT_POT_TOT")' CCM2_LEI_FAT_POT_TOT - Leitura fator de potência total Do CCM 1
'val(78)= SmartTags("CCM2_LEI_ENE_CONS")' CCM2_LEI_ENE_CONS - Leitura Energia consumida Do CCM 2
val(79)= SmartTags("Z2M01_SEL_SILO")' Z2M01_SEL_SILO - Seleção de produção Do moinho (1 - Silo 1, 2 - Silo 2, 3 - Silo 3 e 4 Silo 4)
val(80)= SmartTags("Z2M01M1_ENERG.LEI_TEN_L1_NEU")' Z2M01M1_LEI_TEN_L1_NEU - Leitura tensão entre L1 e neutro Do Motor principal Do moinho
val(81)= SmartTags("Z2M01M1_ENERG.LEI_TEN_L2_NEU")' Z2M01M1_LEI_TEN_L2_NEU - Leitura tensão entre L2 e neutro Do Motor principal Do moinho
val(82)= SmartTags("Z2M01M1_ENERG.LEI_TEN_L3_NEU")' Z2M01M1_LEI_TEN_L3_NEU - Leitura tensão entre L3 e neutro Do Motor principal Do moinho
val(83)= SmartTags("Z2M01M1_ENERG.LEI_TEN_L1_L2")' Z2M01M1_LEI_TEN_L1_L2 - Leitura tensão entre L1 e L2 Do Motor principal Do moinho
val(84)= SmartTags("Z2M01M1_ENERG.LEI_TEN_L2_L3")' Z2M01M1_LEI_TEN_L2_L3 - Leitura tensão entre L2 e L3 Do Motor principal Do moinho
val(85)= SmartTags("Z2M01M1_ENERG.LEI_TEN_L1_L3")' Z2M01M1_LEI_TEN_L1_L3 - Leitura tensão entre L1 e L3 Do Motor principal Do moinho
val(86)= SmartTags("Z2M01M1_ENERG.LEI_COR_L1")' Z2M01M1_LEI_COR_L1 - Leitura corrente em L1 Do Motor principal Do moinho
val(87)= SmartTags("Z2M01M1_ENERG.LEI_COR_L2")' Z2M01M1_LEI_COR_L2 - Leitura corrente em L2 Do Motor principal Do moinho
val(88)= SmartTags("Z2M01M1_ENERG.LEI_COR_L3")' Z2M01M1_LEI_COR_L3 - Leitura corrente em L3 Do Motor principal Do moinho
val(89)= SmartTags("Z2M01M1_ENERG.LEI_POT_ATI_TOT")' Z2M01M1_LEI_POT_ATI_TOT - Leitura potência ativa total Do Motor principal Do moinho
val(90)= SmartTags("Z2M01M1_ENERG.LEI_POT_REA_TOT")' Z2M01M1_LEI_POT_REA_TOT - Leitura potência reativa total Do Motor principal Do moinho
val(91)= SmartTags("Z2M01M1_ENERG.LEI_DEM_POT_ATI")' Z2M01M1_LEI_DEM_POT_ATI - Leitura demanda potência ativa Do Motor principal Do moinho
val(92)= SmartTags("Z2M01M1_ENERG.LEI_FAT_POT_TOT")' Z2M01M1_LEI_FAT_POT_TOT - Leitura fator de potência total Do Motor principal Do moinho
val(93)= SmartTags("Z2M01M1_ENERG.ENE_CONS")' Z2M01M1_LEI_ENE_CONS - Leitura Energia consumida Do Motor principal Do moinho
val(94)= SmartTags("Z2M01M1.Sts_Corrente_Perc")' Z2M01M1_LEI_COR_POR - Leitura corrente em Porcentagem Motor principal moinho
val(95)= SmartTags("Z2J12.Sts.currentPerc")' Z2J12_LEI_COR_POR - Leitura corrente em Porcentagem elevador de processo
val(96)= SmartTags("Z2J12.Sts.current")' Z2J12_LEI_COR_AMP - Leitura corrente em amperes elevador de processo
val(97)= SmartTags("Z2J12.Cmd.velRef")' Z2J12_SET_VEL - Set_point velocidade ventilador filtro de processo
val(98)= SmartTags("Z2J12.Sts.hz")' Z2J12_IND_VEL_FRE - Indicação velocidade em frequencia elevador de processo
val(99)= SmartTags("Z2J12.Sts.rpm")' Z2J12_IND_VEL_RPM - Indicação velocidade em RPM elevador de processo
val(100)= SmartTags("Z2P04.Sts.currentPerc")' Z2P04_LEI_COR_POR - Leitura corrente em Porcentagem ventilador filtro de processo
val(101)= SmartTags("Z2P04.Sts.current")' Z2P04_LEI_COR_AMP - Leitura corrente em amperes ventilador filtro de processo
val(102)= SmartTags("Z2P04.Cmd.velRef")' Z2P04_SET_VEL - Set_poi
val(103)= SmartTags("Z2P04.Sts.hz")' Z2P04_SET_VEL - Set_poi
val(104)= SmartTags("Z2P04.Sts.rpm")' Z2P04_SET_VEL - Set_poi
val(105)= SmartTags("Z2S01.Sts.current")' Z2S01_LEI_COR_POR - Leitura corrente em porcentagem separador dinâmico
val(106)= SmartTags("Z2S01.Sts.currentPerc")' Z2S01_LEI_COR_AMP - Leitura corrente em amperes separador dinâmico
val(107)= SmartTags("Z2S01.Cmd.velRef")' Z2S01_SET_VEL - Set_point velocidade separador dinâmico
val(108)= SmartTags("Z2S01.Sts.hz")' Z2S01_IND_VEL_FRE - Indicação velocidade em frequencia separador dinâmico
val(109)= SmartTags("Z2S01.Sts.rpm")' Z2S01_IND_VEL_RPM - Indicação velocidade em RPM separador dinâmico
val(110)= SmartTags("Z2J03.Sts.current")' Z2J03_LEI_COR_POR - Leitura corrente em porcentagem elevador de retorno
val(111)= SmartTags("Z2J03.Sts.currentPerc")' Z2J03_LEI_COR_AMP - Leitura corrente em amperes elevador de retorno
val(112)= SmartTags("Z2J03.Cmd.velRef")' Z2J03_SET_VEL - Set_point velocidade elevador de retorno
val(113)= SmartTags("Z2J03.Sts.hz")' Z2J03_IND_VEL_FRE - Indicação velocidade em frequencia elevador de retorno
val(114)= SmartTags("Z2J03.Sts.rpm") 'Z2J03_IND_VEL_RPM - Indicação velocidade em RPM elevador de retorno
val(115)= SmartTags("Z2L01.Cmd_SP_Pos")'Z2L01_SET_ABER - Set-point abertura Válvula ar primário do separador


'Formarta e arredunda os valores 
For i = 10 To 115
	
        If i < 116 Then
     val(i) =   FormatNumber(val(i),2,True,False,False)
       
           End If 
Next 

	

Mon = Right("00" & Month (Now()),2)
Y = Year(Date())
d = Right("00" & Day (Now()),2)
H = Right("00"& Hour(Time()),2)
Min = Right("00"& Minute(Time()),2)
S = Second(Time())
 
DataTime= d & Mon & Y

Z2 = DataTime & ".Z02"
'Create Folder year_month
'Set fso = CreateObject("Scripting.FileSystemObject")
'folder_y_m = "Z:\RELATORIOS\" & Y & "_" & Mon
'If Not fso.FolderExists(folder_y_m) Then
' fso.CreateFolder (folder_y_m)
'End If
'Create Folder day
'Set fso1 = CreateObject("Scripting.FileSystemObject")
'folder_day = folder_y_m & "\" & d
'If Not fso1.FolderExists(folder_day) Then
' fso1.CreateFolder (folder_day)
'End If
'Create File Excel


Set fso2 = CreateObject("Scripting.FileSystemObject")
filepath_C = "C:\\Relatorios" & folder_day & "\" & Z2

'Salva no pasta c:\\Relatorios
If Not fso2.FileExists(filepath_C) Then
 fso2.CreateTextFile(filepath_C)
 'Create Header Text
 Set var=CreateObject("Scripting.FileSystemObject")
 Set header=var.OpenTextFile(filepath_C,8)
 header.Close
End If
'Write Data from Tag'
Set fso3 = fso2.OpenTextFile (filepath_C,8,1)
fso3.WriteLine Y & Mon & d & H & Min & ";" & val(10) & ";" & val(11) & ";" & val(12) & ";" & val(13) & ";" & val(14) & ";" & val(15) & ";" & val(16) & ";" & val(17) & ";" & val(18) & ";" & val(19) & ";" & val(20) & ";" & val(21) & ";" & val(22) & ";" & val(23) & ";" & val(24) & ";" & val(25) & ";" & val(26) & ";" & val(27) & ";" & val(28) & ";" & val(29) & ";" & val(30) & ";" & val(31) & ";" & val(32) & ";" & val(33) & ";" & val(34) & ";" & val(35) & ";" & val(36) & ";" & val(37) & ";" & val(38) & ";" & val(39) & ";" & val(40) & ";" & val(41) & ";" & val(42) & ";" & val(43) & ";" & val(44) & ";" & val(45) & ";" & val(46) & ";" & val(47) & ";" & val(48) & ";" & val(49) & ";" & val(50) & ";" & val(51) & ";" & val(52) & ";" & val(53) & ";" & val(54) & ";" & val(55) & ";" & val(56) & ";" & val(57) & ";" & val(58) & ";" & val(59) & ";" & val(60) & ";" & val(61) & ";" & val(62) & ";" & val(63) & ";" & val(64) & ";" & val(65) & ";" & val(66) & ";" & val(67) & ";" & val(68) & ";" & val(69) & ";" & val(70) & ";" & val(71) & ";" & val(72) & ";" & val(73) & ";" & val(74) & ";" & val(75) & ";" & val(76) & ";" & val(77) & ";" & val(78) & ";" & val(79) & ";" & val(80) & ";" & val(81) & ";" & val(82) & ";" & val(83) & ";" & val(84) & ";" & val(85) & ";" & val(86) & ";" & val(87) & ";" & val(88) & ";" & val(89) & ";" & val(90) & ";" & val(91) & ";" & val(92) & ";" & val(92) & ";" & val(94) & ";" & val(95) & ";" & val(96) & ";" & val(97) & ";" & val(98) & ";" & val(99) & ";" & val(100) & ";" & val(101) & ";" & val(102) & ";" & val(103) & ";" & val(105) & ";" &  val(104) &";"& val(106) & ";" & val(107) &";"&  val(108)  & "; " & val(109) & ";" &  val(110) & ";" &  val(111) & ";" &  val(112) & ";" & val(113) & ";" & val(114) & ";" & val(115)
fso3.Close

'Salva no pasta z:\\
filepath = "Z:\\" & folder_day & "\" & Z2
If Not fso2.FileExists(filepath) Then
 fso2.CreateTextFile(filepath)
 'Create Header Text
 Set var=CreateObject("Scripting.FileSystemObject")
 Set header=var.OpenTextFile(filepath,8)
 header.Close
End If
'Write Data from Tag'
Set fso3 = fso2.OpenTextFile (filepath,8,1)
fso3.WriteLine Y & Mon & d & H & Min & ";" & val(10) & ";" & val(11) & ";" & val(12) & ";" & val(13) & ";" & val(14) & ";" & val(15) & ";" & val(16) & ";" & val(17) & ";" & val(18) & ";" & val(19) & ";" & val(20) & ";" & val(21) & ";" & val(22) & ";" & val(23) & ";" & val(24) & ";" & val(25) & ";" & val(26) & ";" & val(27) & ";" & val(28) & ";" & val(29) & ";" & val(30) & ";" & val(31) & ";" & val(32) & ";" & val(33) & ";" & val(34) & ";" & val(35) & ";" & val(36) & ";" & val(37) & ";" & val(38) & ";" & val(39) & ";" & val(40) & ";" & val(41) & ";" & val(42) & ";" & val(43) & ";" & val(44) & ";" & val(45) & ";" & val(46) & ";" & val(47) & ";" & val(48) & ";" & val(49) & ";" & val(50) & ";" & val(51) & ";" & val(52) & ";" & val(53) & ";" & val(54) & ";" & val(55) & ";" & val(56) & ";" & val(57) & ";" & val(58) & ";" & val(59) & ";" & val(60) & ";" & val(61) & ";" & val(62) & ";" & val(63) & ";" & val(64) & ";" & val(65) & ";" & val(66) & ";" & val(67) & ";" & val(68) & ";" & val(69) & ";" & val(70) & ";" & val(71) & ";" & val(72) & ";" & val(73) & ";" & val(74) & ";" & val(75) & ";" & val(76) & ";" & val(77) & ";" & val(78) & ";" & val(79) & ";" & val(80) & ";" & val(81) & ";" & val(82) & ";" & val(83) & ";" & val(84) & ";" & val(85) & ";" & val(86) & ";" & val(87) & ";" & val(88) & ";" & val(89) & ";" & val(90) & ";" & val(91) & ";" & val(92) & ";" & val(92) & ";" & val(94) & ";" & val(95) & ";" & val(96) & ";" & val(97) & ";" & val(98) & ";" & val(99) & ";" & val(100) & ";" & val(101) & ";" & val(102) & ";" & val(103) & ";" & val(105) & ";" &  val(104) &";"& val(106) & ";" & val(107) &";"&  val(108)  & "; " & val(109) & ";" &  val(110) & ";" &  val(111) & ";" &  val(112) & ";" & val(113) & ";" & val(114) & ";" & val(115)
fso3.Close




End Sub