

Function GEP_Moagem_3()
'Tip:
' 1. Use the <CTRL+SPACE> or <CTRL+I> shortcut to open a list of all objects and functions
' 2. Write the code using the HMI Runtime object.
'  Example: HmiRuntime.Screens("Screen_1").
' 3. Use the <CTRL+J> shortcut to create an object reference.
'Write the code as of this position:

'Create Folder
Dim DataTime
Dim folder_y_m, folder_day, Z3, filepath, var, header ,filepath_C
Dim fso, fso1, fso2, fso3  
Dim H, Min, S, d, Mon, Y
Dim i
Dim val(106)


val(10)=SmartTags("Z3M01M1_SIN_FUN_FLOAT")' Z3M01M1_SIN_FUN_FLOAT - Sinaliza funcionando motor principal Do moinho (1 - Ligado e 2 - Desligado)
val(11)=SmartTags("Z3A01_POR_VAZ")' Z3A01_POR_VAZ - Porcentagem de Vazão da balança de calcário 
val(12)=SmartTags("Z3A01_UMI_MAT")' Z3A01_UMI_MAT - Umidade Do material da balança de calcário
val(13)=SmartTags("Z3A01_VAZ_UMI")' Z3A01_VAZ_UMI - Vazão Do material base umida na balança de calcário
val(14)=SmartTags("Z3A01_Vaz_Sec")' Z3A01_VAZ_SEC - Vazão Do material base seca na balança de calcário
val(15)=SmartTags("Z3A01_TOT_UMI")' Z3A01_TOT_UMI - Totalizador Do material base umida na balança de calcário
val(16)=SmartTags("Z3A02_POR_VAZ")' Z3A02_POR_VAZ - Porcentagem de Vazão da balança de gesso
val(17)=SmartTags("Z3A02_VAZ_DES")' Z3A02_VAZ_DES - Vazão desejada da balança de gesso
val(18)=SmartTags("Z3A02_UMI_MAT")' Z3A02_UMI_MAT - Umidade Do material da balança de gesso
val(19)=SmartTags("Z3A02_VAZ_UMI")' Z3A02_VAZ_UMI - Vazão Do material base umida na balança de gesso
val(20)=SmartTags("Z3A02_Vaz_Sec")' Z3A02_VAZ_SEC - Vazão Do material base seca na balança de gesso
val(21)=SmartTags("Z3A02_TOT_UMI")' Z3A02_TOT_UMI - Totalizador Do material base umida na balança de gesso
val(22)=SmartTags("Z3A03_POR_VAZ")' Z3A03_POR_VAZ - Porcentagem de Vazão da balança de clinquer
val(23)=SmartTags("Z3A03_VAZ_DES")' Z3A03_VAZ_DES - Vazão desejada da balança de clinquer
val(24)=SmartTags("Z3A03_UMI_MAT")' Z3A03_UMI_MAT - Umidade Do material da balança de clinquer
val(25)=SmartTags("Z3A03_VAZ_UMI")' Z3A03_VAZ_UMI - Vazão Do material base umida na balança de clinquer
val(26)=SmartTags("Z3A03_Vaz_Sec")' Z3A03_VAZ_SEC - Vazão Do material base seca na balança de clinquer
val(27)=SmartTags("Z3A03_TOT_UMI")' Z3A03_TOT_UMI - Totalizador Do material base umida na balança de clinquer
val(28)=SmartTags("Z3A04_POR_VAZ")' Z3A04_POR_VAZ - Porcentagem de Vazão da balança de escória
val(29)=SmartTags("Z3A04_VAZ_DES")' Z3A04_VAZ_DES - Vazão desejada da balança de escória
val(30)=SmartTags("Z3A04_UMI_MAT")' Z3A04_UMI_MAT - Umidade Do material da balança de escória
val(31)=SmartTags("Z3A04_VAZ_UMI")' Z3A04_VAZ_UMI - Vazão Do material base umida na balança de escória
val(32)=SmartTags("Z3A04_Vaz_Sec")' Z3A04_VAZ_SEC - Vazão Do material base seca na balança de escória
val(33)=SmartTags("Z3A04_TOT_UMI")' Z3A04_TOT_UMI - Totalizador Do material base umida na balança de escória
val(34)=SmartTags("BAL_DOS_SOM_TOT_POR")' BAL_DOS_SOM_TOT_POR - Soma total Porcentagem das balanças dosadoras
val(35)=SmartTags("BAL_DOS_SOM_TOT_VAZ_UMI_M3")' BAL_DOS_SOM_TOT_VAZ_UMI - Soma total Vazão umida das balanças dosadoras
val(36)=SmartTags("BAL_DOS_SOM_TOT_VAZ_SEC_MC3")' BAL_DOS_SOM_TOT_VAZ_SEC - Soma total Vazão seca das balanças dosadoras
val(37)=SmartTags("Z3J03C1_SET_POI_PID_M3")' Z3J03C1_SET_POI_PID - Set-point corrente elevador retorno de controle Do PID alimentação moinho
val(38)=SmartTags("SET_POI_PRO_MOI")' SET_POI_PRO_MOI - Set-point de produção Do moinho
val(39)=SmartTags("SET_POI_MAN_PRO_MOI_MC3")' SET_POI_MAN_PRO_MOI - Set-point manual da produção Do moinho
val(40)=SmartTags("LIM_MAX_PRO_MOI")' LIM_MAX_PRO_MOI - Limite máximo de produção Do moinho
val(41)=SmartTags("VAR_PID_PRO_MOI")' VAR_PID_PRO_MOI - Variavel PID da produção Do moinho
val(42)=SmartTags("Z3A01_PED_VEL_LOC")' Z3A01_PED_VEL_LOC - Pedido de velocidade em local da balança de calcário
val(43)=SmartTags("Z3A02_PED_VEL_LOC")' Z3A02_PED_VEL_LOC - Pedido de velocidade em local da balança de gesso
val(44)=SmartTags("Z3A03_PED_VEL_LOC")' Z3A03_PED_VEL_LOC - Pedido de velocidade em local da balança de clinquer
val(45)=SmartTags("Z3A04_PED_VEL_LOC")' Z3A04_PED_VEL_LOC - Pedido de velocidade em local da balança de escória
val(46)=SmartTags("Z3M01M1_TOT_MIN_FUN")' Z3M01M1_TOT_MIN_FUN - Totalizador funcionamento (minutos) Do motor principal Do moinho
val(47)=SmartTags("Z3M01M1_TOT_SEG_FUN")' Z3M01M1_TOT_SEG_FUN - Totalizador funcionamento (segundos) Do motor principal Do moinho
val(48)=SmartTags("Z3J01T1.STS_O_Sinal_EU")' Z3J01T1_LEI_TEMP - Leitura temperatura de saída Do moinho
val(49)=SmartTags("Z3P01P1.STS_O_Sinal_EU")' Z3P01P1_LEI_PRES - Leitura pressão entrada Do filtro de processo
val(50)=SmartTags("Z3P01P2.STS_O_Sinal_EU")' Z3P01P2_LEI_PRES - Leitura pressão saída Do filtro de processo
val(51)=SmartTags("Z3P01T1.STS_O_Sinal_EU")' Z3P01T1_LEI_TEMP - Leitura temperatura entrada filtro de processo
val(52)=SmartTags("Z3S01T2.STS_O_Sinal_EU")' Z3S01T2_LEI_TEMP - Leitura temperatura da saída Do moinho para o separador
val(53)=SmartTags("Z3S01P1.STS_O_Sinal_EU")' Z3S01P1_LEI_PRES - Leitura pressão da saída Do moinho para o separador
val(54)=SmartTags("Z3L01.Sts_Pos")' Z3L01_LEI_ABER - Leitura abertura válvula ar primário Do separador
val(55)=SmartTags("Z3L05.Sts_Pos")' Z3L05_LEI_ABER - Leitura abertura válvula ar secundário Do separador
val(56)=SmartTags("Z3P05.Sts_Pos")' Z3P05_LEI_ABER - Leitura abertura válvula ar filtro de processo
val(57)=SmartTags("Z3P01D1.STS_O_Sinal_EU")' Z3P01D1_LEI_PRE_DIF - Leitura pressão diferencial Do filtro de processo
val(58)=SmartTags("Z3M01M1_TOT_CONS_ENE")' Z3M01M1_TOT_CONS_ENE - Totalizador de Consumo de Energia Do motor Do moinho
val(59)=SmartTags("CCM3_TOT_CONS_ENE")' CCM3_TOT_CONS_ENE - Totalizador de Consumo de Energia Do CCM 3
val(60)=SmartTags("SOMA_TOT_BALANCAS")' SOMA_TOT_BALANCAS - Soma total dos totalizadores
val(61)=SmartTags("TOT_INICIAL")' TOT_INICIAL - Totalizador inicial balanças
val(62)=SmartTags("TOT_ACUMULADO")' TOT_ACUMULADO - Totalizador acumulado
val(63)=SmartTags("CCM5_LEI_TEN_L1_NEU")' CCM5_LEI_TEN_L1_NEU - Leitura tensão entre L1 e neutro Do CCM 5
val(64)=SmartTags("CCM5_LEI_TEN_L2_NEU")' CCM5_LEI_TEN_L2_NEU - Leitura tensão entre L2 e neutro Do CCM 5
val(65)=SmartTags("CCM5_LEI_TEN_L3_NEU")' CCM5_LEI_TEN_L3_NEU - Leitura tensão entre L3 e neutro Do CCM 5
val(66)=SmartTags("CCM5_LEI_TEN_L1_L2")' CCM5_LEI_TEN_L1_L2 - Leitura tensão entre L1 e L2 Do CCM 5
val(67)=SmartTags("CCM5_LEI_TEN_L2_L3")' CCM5_LEI_TEN_L2_L3 - Leitura tensão entre L2 e L3 Do CCM 5
val(68)=SmartTags("CCM5_LEI_TEN_L1_L3")' CCM5_LEI_TEN_L1_L3 - Leitura tensão entre L1 e L3 Do CCM 5
val(69)=SmartTags("CCM5_LEI_COR_L1")' CCM5_LEI_COR_L1 - Leitura corrente em L1 Do CCM 5
val(70)=SmartTags("CCM5_LEI_COR_L2")' CCM5_LEI_COR_L2 - Leitura corrente em L2 Do CCM 5
val(71)=SmartTags("CCM5_LEI_COR_L3")' CCM5_LEI_COR_L3 - Leitura corrente em L3 Do CCM 5
val(72)=SmartTags("CCM5_LEI_POT_ATI_TOT")' CCM5_LEI_POT_ATI_TOT - Leitura potência ativa total Do CCM 5
val(73)=SmartTags("CCM5_LEI_POT_REA_TOT")' CCM5_LEI_POT_REA_TOT - Leitura potência reativa total Do CCM 5
val(74)=SmartTags("CCM5_LEI_DEM_POT_ATI")' CCM5_LEI_DEM_POT_ATI - Leitura demanda potência ativa Do CCM 5
val(75)=SmartTags("CCM5_LEI_FAT_POT_TOT")' CCM5_LEI_FAT_POT_TOT - Leitura fator de potência total Do CCM 5
val(76)=SmartTags("CCM5_LEI_ENE_CONS")' CCM5_LEI_ENE_CONS - Leitura Energia consumida Do CCM 5
val(77)=SmartTags("Z2M01_PRODUTO")' Z2M01_PRODUTO - Produto produzido ( 1 - CPIII 40 RS, 2 - CPII E40, 3 - Ensacado)
val(78)=SmartTags("Z2M01_SEL_SILO")' Z2M01_SEL_SILO - Seleção de produção Do moinho (1 - Silo 1, 2 - Silo 2, 3 - Silo 3 e 4 Silo 4)
val(79)=SmartTags("Z3M01M1_SIN_FUN_FLOAT")' Z3M01M1_SIN_FUN_FLOAT - Sinaliza funcionando motor principal Do moinho (1 - Ligado e 2 - Desligado) 
val(80)=SmartTags("Z3M01M1_LEI_TEN_L1_NEU")' Z3M01M1_LEI_TEN_L1_NEU - Leitura tensão entre L1 e neutro Do motor principal Do moinho
val(81)=SmartTags("Z3M01M1_LEI_TEN_L2_NEU")' Z3M01M1_LEI_TEN_L2_NEU - Leitura tensão entre L2 e neutro Do motor principal Do moinho
val(82)=SmartTags("Z3M01M1_LEI_TEN_L3_NEU")' Z3M01M1_LEI_TEN_L3_NEU - Leitura tensão entre L3 e neutro Do motor principal Do moinho
val(83)=SmartTags("Z3M01M1_LEI_TEN_L1_L2")' Z3M01M1_LEI_TEN_L1_L2 - Leitura tensão entre L1 e L2 Do motor principal Do moinho
val(84)=SmartTags("Z3M01M1_LEI_TEN_L2_L3")' Z3M01M1_LEI_TEN_L2_L3 - Leitura tensão entre L2 e L3 Do motor principal Do moinho
val(85)=SmartTags("Z3M01M1_LEI_TEN_L1_L3")' Z3M01M1_LEI_TEN_L1_L3 - Leitura tensão entre L1 e L3 Do motor principal Do moinho
val(86)=SmartTags("Z3M01M1_LEI_COR_L1")' Z3M01M1_LEI_COR_L1 - Leitura corrente em L1 Do motor principal Do moinho
val(87)=SmartTags("Z3M01M1_LEI_COR_L2")' Z3M01M1_LEI_COR_L2 - Leitura corrente em L2 Do motor principal Do moinho
val(88)=SmartTags("Z3M01M1_LEI_COR_L3")' Z3M01M1_LEI_COR_L3 - Leitura corrente em L3 Do motor principal Do moinho
val(89)=SmartTags("Z3M01M1_LEI_POT_ATI_TOT")' Z3M01M1_LEI_POT_ATI_TOT - Leitura potência ativa total Do motor principal Do moinho
val(90)=SmartTags("Z3M01M1_LEI_POT_REA_TOT")' Z3M01M1_LEI_POT_REA_TOT - Leitura potência reativa total Do motor principal Do moinho
val(91)=SmartTags("Z3M01M1_LEI_DEM_POT_ATI")' Z3M01M1_LEI_DEM_POT_ATI - Leitura demanda potência ativa Do motor principal Do moinho
val(92)=SmartTags("Z3M01M1_LEI_FAT_POT_TOT")' Z3M01M1_LEI_FAT_POT_TOT - Leitura fator de potência total Do motor principal Do moinho
val(93)=SmartTags("Z3M01M1_LEI_ENE_CONS")' Z3M01M1_LEI_ENE_CONS - Leitura Energia consumida Do motor principal Do moinho
val(94)=SmartTags("Z3M01M1_ANL.STS_O_Sinal_Perc")' Z3M01M1_LEI_COR_POR - Leitura corrente em Porcentagem
val(95)=SmartTags("Z3P04.Sts_Corrente_Perc")' Z3P04_LEI_COR_POR - Leitura corrente em Porcentagem ventilador filtro de processo
val(96)=SmartTags("Z3P04.Sts_Corrente")' Z3P04_LEI_COR_AMP - Leitura corrente em amperes ventilador filtro de processo
val(97)=SmartTags("Z3S01.STS_O_Sinal_Perc")' Z3S01_LEI_COR_POR - Leitura corrente em Porcentagem separador dinâmico
val(98)=SmartTags("Z3S01M1.Sts.current")' Z3S01_LEI_COR_AMP - Leitura corrente em amperes separador dinâmico
val(99)=SmartTags("Z3S01M1.Cmd.velRef")' Z3S01_SET_VEL - Set_point velocidade separador dinâmico
val(100)=SmartTags("Z3S01M1.Sts.hz")' Z3S01_IND_VEL_FRE - Indicação velocidade em frequencia separador dinâmico
val(101)=SmartTags("Z3S01M1.Sts.rpm")' Z3S01_IND_VEL_RPM - Indicação velocidade em RPM separador dinâmico
val(102)=SmartTags("Z3J03M1.Sts.currentPerc")' Z3J03M1_LEI_COR_POR - Leitura corrente em Porcentagem elevador de retorno
val(103)=SmartTags("Z3J03M1.Sts.current")' Z3J03M1_LEI_COR_AMP - Leitura corrente em amperes elevador de retorno
val(104)=SmartTags("Z3L01.Cmd_SP_Pos")' Z3L01_SET_ABER - Set-point abertura válvula ar primário Do separador
val(105)=SmartTags("Z3L05.Cmd_SP_Pos")' Z3L05_SET_ABER - Set-point abertura válvula ar secundário Do separador
val(106)=SmartTags("Z3P05.Cmd_SP_Pos")' Z3P05_SET_ABER - Set-point abertura válvula motorizada ar filtro de processo

'Formarta e arredunda os valores 
For i = 10 To 106
	
        If i < 107 Then
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

Z3 = DataTime & ".Z03"
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
filepath_C = "C:\\Relatorios" & folder_day & "\" & Z3


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
fso3.WriteLine Y & Mon & d & H & Min & ";" & val(10) & ";" & val(11) & ";" & val(12) & ";" & val(13) & ";" & val(14) & ";" & val(15) & ";" & val(16) & ";" & val(17) & ";" & val(18) & ";" & val(19) & ";" & val(20) & ";" & val(21) & ";" & val(22)& ";" & val(23) & ";" & val(24) & ";" & val(25) & ";" & val(26) & ";" & val(27) & ";" & val(28) & ";" & val(29) & ";" & val(30) & ";" & val(31) & ";" & val(32) & ";" & val(33) & ";" & val(34) & ";" & val(35) & ";" & val(36) & ";" & val(37) & ";" & val(38) & ";" & val(39) & ";" & val(40) & ";" & val(41) & ";" & val(42) & ";" & val(43) & ";" & val(44) & ";" & val(45) & ";" & val(46) & ";" & val(47) & ";" & val(48) & ";" & val(49) & ";" & val(50) & ";" & val(51) & ";" & val(52) & ";" & val(53) & ";" & val(54) & ";" & val(55) & ";" & val(56) & ";" & val(57) & ";" & val(58) & ";" & val(59) & ";" & val(60) & ";" & val(61) & ";" & val(62) & ";" & val(63) & ";" & val(64) & ";" & val(65) & ";" & val(66) & ";" & val(67) & ";" & val(68) & ";" & val(69) & ";" & val(70) & ";" & val(71) & ";" & val(72) & ";" & val(73) & ";" & val(74) & ";" & val(75) & ";" &val(76) & ";" & val(77) & ";" & val(78) & ";" & val(79) & ";" & val(80) & ";" & val(81) & ";" & val(82) & ";" & val(83) & ";" & val(84) & ";" & val(85) & ";" & val(86) & ";" & val(87) & ";" & val(88) & ";" & val(89) & ";" & val(90) & ";" & val(91) & ";" & val(92) & ";" & val(92) & ";" & val(94) & ";" & val(95) & ";" & val(96) & ";" & val(97) & ";" & val(98) & ";" & val(99) & ";" & val(100) & ";" & val(101) & ";" & val(102) & ";" & val(103) & ";" & val(104) & ";" & val(105) & ";" & val(106) 
fso3.Close


'Salva no pasta z:\\
filepath = "Z:\\" & folder_day & "\" & Z3
If Not fso2.FileExists(filepath) Then
 fso2.CreateTextFile(filepath)
 'Create Header Text
 Set var=CreateObject("Scripting.FileSystemObject")
 Set header=var.OpenTextFile(filepath,8)
 header.Close
End If
'Write Data from Tag'
Set fso3 = fso2.OpenTextFile (filepath,8,1)
fso3.WriteLine Y & Mon & d & H & Min & ";" & val(10) & ";" & val(11) & ";" & val(12) & ";" & val(13) & ";" & val(14) & ";" & val(15) & ";" & val(16) & ";" & val(17) & ";" & val(18) & ";" & val(19) & ";" & val(20) & ";" & val(21) & ";" & val(22)& ";" & val(23) & ";" & val(24) & ";" & val(25) & ";" & val(26) & ";" & val(27) & ";" & val(28) & ";" & val(29) & ";" & val(30) & ";" & val(31) & ";" & val(32) & ";" & val(33) & ";" & val(34) & ";" & val(35) & ";" & val(36) & ";" & val(37) & ";" & val(38) & ";" & val(39) & ";" & val(40) & ";" & val(41) & ";" & val(42) & ";" & val(43) & ";" & val(44) & ";" & val(45) & ";" & val(46) & ";" & val(47) & ";" & val(48) & ";" & val(49) & ";" & val(50) & ";" & val(51) & ";" & val(52) & ";" & val(53) & ";" & val(54) & ";" & val(55) & ";" & val(56) & ";" & val(57) & ";" & val(58) & ";" & val(59) & ";" & val(60) & ";" & val(61) & ";" & val(62) & ";" & val(63) & ";" & val(64) & ";" & val(65) & ";" & val(66) & ";" & val(67) & ";" & val(68) & ";" & val(69) & ";" & val(70) & ";" & val(71) & ";" & val(72) & ";" & val(73) & ";" & val(74) & ";" & val(75) & ";" &val(76) & ";" & val(77) & ";" & val(78) & ";" & val(79) & ";" & val(80) & ";" & val(81) & ";" & val(82) & ";" & val(83) & ";" & val(84) & ";" & val(85) & ";" & val(86) & ";" & val(87) & ";" & val(88) & ";" & val(89) & ";" & val(90) & ";" & val(91) & ";" & val(92) & ";" & val(92) & ";" & val(94) & ";" & val(95) & ";" & val(96) & ";" & val(97) & ";" & val(98) & ";" & val(99) & ";" & val(100) & ";" & val(101) & ";" & val(102) & ";" & val(103) & ";" & val(104) & ";" & val(105) & ";" & val(106) 
fso3.Close


End Function