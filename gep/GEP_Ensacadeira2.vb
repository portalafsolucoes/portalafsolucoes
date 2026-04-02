
Sub GEP_Ensacadeira2()
'Tip:
' 1. Use the <CTRL+SPACE> or <CTRL+I> shortcut to open a list of all objects and functions
' 2. Write the code using the HMI Runtime object.
'  Example: HmiRuntime.Screens("Screen_1").   
' 3. Use the <CTRL+J> shortcut to create an object reference.
'Write the code as of this position:

Dim DataTime
Dim folder_y_m, folder_day, EN2, filepath, var, header,filepath_C
Dim fso, fso1, fso2, fso3  
Dim H, Min, S, d, Mon, Y
Dim i 
Dim Val(29)

Val(10)= SmartTags("Func_ENS2") 'ENSAC_2_SIN_FUN_FLOAT - Sinaliza funcionando Ensacadeira 2 (1 - Ligado e 2 - Desligado) 
Val(11)= SmartTags("P3J24.Sts_Corrente") ' P3J24_LEI_COR_POR - Leitura corrente em porcentagem elevador da ensacadeira 2
Val(12)= SmartTags("P3J24.Sts_Corrente_Perc") 'P3J24_LEI_COR_AMP - Leitura corrente em amperes elevador da ensacadeira 2
Val(13)= SmartTags("P3P11.Sts.current") 'P3P11_LEI_COR_POR - Leitura corrente em porcentagem exaustor filtro desp. da ensacadeira
Val(14)= SmartTags("P3P11.Sts.currentPerc") 'P3P11_LEI_COR_AMP - Leitura corrente em amperes exaustor filtro desp. da ensacadeira
Val(15)= SmartTags("ContSacosAnt") 'Contador de sacos Ensacadeira 2 (val(or anterior)
Val(16)= SmartTags("ContSacosAtu") 'Contador de sacos Ensacadeira 2 (val(or atual)
Val(17)= SmartTags("ContSacosGer") 'Contador de sacos Ensacadeira 2 (val(or geral)
Val(18)= SmartTags("HorAnt_Ens")  'Horímetro anterior Ensacadeira 2 (Hora)
Val(19)= SmartTags("MinAnt_Ens")  'Horímetro anterior Ensacadeira 2 (Minuto)
Val(20)= SmartTags("SegAnt_Ens")  'Horímetro anterior Ensacadeira 2 (Segundo)
Val(21)= SmartTags("Hor_Ens")  'Horímetro atual Ensacadeira 2 (Hora)
Val(22)= SmartTags("Min_Ens")  'Horímetro atual Ensacadeira 2 (Minuto)
Val(23)= SmartTags("Seg_Ens")  'Horímetro atual Ensacadeira 2 (Segundo)
Val(24)= SmartTags("HorTot_Ens")  'Horímetro geral Ensacadeira 2 (Hora)
Val(25)= SmartTags("MinTot_Ens")  'Horímetro geral Ensacadeira 2 (Minuto)
Val(26)= SmartTags("SegTot_Ens")  'Horímetro geral Ensacadeira 2 (Segundo)
Val(27)= 3.0  'Ensacadeira 1: Produto produzido ( 1 - CPIII 40 RS, 2 - CPII E40, 3 - Ensacado (CPII E 32 RS))
Val(28)= 3.0  'Seleção silo ensacadeira (1 - Silo 1, 2 - Silo 2, 3 - Silo 3 e 4 Silo 4)
Val(29)= SmartTags("Cont_saco(GEP)")  ' Contador de sacos ensacadeira 1 para o GEP.

'Formarta e arredunda os valores 
For i = 10 To 29
	
        If i < 30 Then
     Val(i) =   FormatNumber(Val(i),2,True,False,False)
       
           End If 
Next 


Mon = Right("00" & Month (Now()),2)
Y = Year(Date())
d = Right("00" & Day (Now()),2)
H = Right("00"& Hour(Time()),2)
Min = Right("00"& Minute(Time()),2)
S = Second(Time())
 
DataTime= d & Mon & Y

EN2 = DataTime & ".EN2"



Set fso2 = CreateObject("Scripting.FileSystemObject")
filepath_C = "C:\\Relatorios" & folder_day & "\" & EN2

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
fso3.WriteLine Y & Mon & d & H & Min &  ";" & Val(10) & ";" & Val(11) & ";" & Val(12) & ";" & Val(13) & ";" & Val(14) & ";" & Val(15) & ";" & Val(16) & ";" & Val(17) & ";" & Val(18) & ";" & Val(19) & ";" & Val(20) & ";" & Val(21) & ";" & Val(22) & ";" & Val(23) & ";" & Val(24) & ";" & Val(25) & ";" & Val(26) & ";" & Val(27) & ";" & Val(28) &";" & Val(29)
fso3.Close


'Salva no pasta z:\\
filepath = "Z:\\" & folder_day & "\" & EN2
If Not fso2.FileExists(filepath) Then
 fso2.CreateTextFile(filepath)
 'Create Header Text
 Set var=CreateObject("Scripting.FileSystemObject")
 Set header=var.OpenTextFile(filepath,8)
 header.Close
End If
'Write Data from Tag'
Set fso3 = fso2.OpenTextFile (filepath,8,1)
fso3.WriteLine Y & Mon & d & H & Min &  ";" & Val(10) & ";" & Val(11) & ";" & Val(12) & ";" & Val(13) & ";" & Val(14) & ";" & Val(15) & ";" & Val(16) & ";" & Val(17) & ";" & Val(18) & ";" & Val(19) & ";" & Val(20) & ";" & Val(21) & ";" & Val(22) & ";" & Val(23) & ";" & Val(24) & ";" & Val(25) & ";" & Val(26) & ";" & Val(27) & ";" & Val(28) &";" & Val(29)
fso3.Close


End Sub